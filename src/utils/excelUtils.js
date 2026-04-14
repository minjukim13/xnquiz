import * as XLSX from 'xlsx'
import { QUIZ_TYPES } from '../data/mockData'

// ── 문항 분석 다운로드 (QuizStats — StatsTab) ─────────────────────────────
export function downloadItemAnalysisXlsx(quiz, quizQuestions, students) {
  const graded = students.filter(s => s.submitted && s.score !== null)
  if (!graded.length) return

  const getScore = (s, qId) => {
    if (s.autoScores?.[qId] !== undefined) return s.autoScores[qId]
    if (s.manualScores?.[qId] !== undefined) return s.manualScores[qId]
    return null
  }

  const totalScores = graded.map(s => s.score)
  const meanTotal = totalScores.reduce((a, b) => a + b, 0) / totalScores.length
  const stdTotal = Math.sqrt(totalScores.reduce((a, b) => a + (b - meanTotal) ** 2, 0) / totalScores.length)

  const n27 = Math.max(1, Math.floor(graded.length * 0.27))
  const sorted = [...graded].sort((a, b) => a.score - b.score)
  const lower27 = sorted.slice(0, n27)
  const upper27 = sorted.slice(sorted.length - n27)

  const qMetrics = quizQuestions.map(q => {
    const qScores = graded.map(s => getScore(s, q.id)).filter(v => v !== null)
    const avgQ = qScores.length ? qScores.reduce((a, b) => a + b, 0) / qScores.length : null
    const rate = avgQ != null ? Math.round((avgQ / q.points) * 100) : null
    const difficulty = rate == null ? '-' : rate >= 70 ? '쉬움' : rate >= 40 ? '보통' : '어려움'

    const correctCount = q.autoGrade
      ? graded.filter(s => getScore(s, q.id) === q.points).length
      : null
    const correctRate = correctCount != null && graded.length
      ? Math.round((correctCount / graded.length) * 100)
      : null

    const upperAvg = upper27.map(s => getScore(s, q.id) ?? 0).reduce((a, b) => a + b, 0) / upper27.length
    const lowerAvg = lower27.map(s => getScore(s, q.id) ?? 0).reduce((a, b) => a + b, 0) / lower27.length
    const discrimination = parseFloat(((upperAvg - lowerAvg) / q.points).toFixed(3))

    let rpb = '-'
    if (q.autoGrade && graded.length >= 2 && stdTotal > 0) {
      const binary = graded.map(s => getScore(s, q.id) === q.points ? 1 : 0)
      const p = binary.reduce((a, b) => a + b, 0) / binary.length
      const qp = 1 - p
      if (p > 0 && qp > 0) {
        const passTotal = totalScores.filter((_, i) => binary[i] === 1)
        const meanPass = passTotal.reduce((a, b) => a + b, 0) / passTotal.length
        rpb = parseFloat(((meanPass - meanTotal) / stdTotal * Math.sqrt(p * qp)).toFixed(3))
      }
    }

    return {
      order: q.order,
      type: QUIZ_TYPES[q.type]?.label ?? q.type,
      points: q.points,
      avgScore: avgQ != null ? parseFloat(avgQ.toFixed(2)) : '-',
      rate: rate ?? '-',
      difficulty,
      correctCount: correctCount ?? '-',
      correctRate: correctRate != null ? `${correctRate}%` : '-',
      discrimination,
      rpb,
    }
  })

  // Cronbach α
  let cronbach = '-'
  const validQIds = quizQuestions.filter(q => graded.some(s => getScore(s, q.id) !== null)).map(q => q.id)
  if (validQIds.length >= 2) {
    const itemVars = validQIds.map(qId => {
      const vals = graded.map(s => getScore(s, qId) ?? 0)
      const m = vals.reduce((a, b) => a + b, 0) / vals.length
      return vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length
    })
    const compositeVals = graded.map(s => validQIds.reduce((sum, qId) => sum + (getScore(s, qId) ?? 0), 0))
    const mC = compositeVals.reduce((a, b) => a + b, 0) / compositeVals.length
    const totalVar = compositeVals.reduce((a, b) => a + (b - mC) ** 2, 0) / compositeVals.length
    if (totalVar > 0) {
      const k = validQIds.length
      cronbach = parseFloat((k / (k - 1) * (1 - itemVars.reduce((a, b) => a + b, 0) / totalVar)).toFixed(3))
    }
  }

  // 퀴즈 요약 지표
  const avg = totalScores.reduce((a, b) => a + b, 0) / totalScores.length
  const stdev = Math.sqrt(totalScores.reduce((a, b) => a + (b - avg) ** 2, 0) / totalScores.length)
  const submitRate = ((quiz.submitted / quiz.totalStudents) * 100).toFixed(1)
  const gradeRate = quiz.submitted > 0 ? ((quiz.graded / quiz.submitted) * 100).toFixed(1) : 0

  // Sheet 1: 문항 분석
  const headers1 = ['문항', '유형', '배점(점)', '평균점수', '득점률(%)', '난이도', '정답학생수', '정답률', '변별도 D', '이분상관계수 r_pb']
  const rows1 = qMetrics.map(m => [
    `Q${m.order}`, m.type, m.points, m.avgScore, m.rate,
    m.difficulty, m.correctCount, m.correctRate, m.discrimination, m.rpb,
  ])
  const ws1 = XLSX.utils.aoa_to_sheet([headers1, ...rows1])
  ws1['!cols'] = [
    { wch: 7 }, { wch: 14 }, { wch: 9 }, { wch: 10 }, { wch: 10 },
    { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 17 },
  ]
  headers1.forEach((_, i) => {
    const cell = ws1[XLSX.utils.encode_cell({ r: 0, c: i })]
    if (cell) cell.s = { font: { bold: true } }
  })

  // Sheet 2: 퀴즈 요약
  const rows2 = [
    ['항목', '값'],
    ['퀴즈명', quiz.title],
    ['과목', quiz.course],
    ['만점', `${quiz.totalPoints}점`],
    ['평균 점수', parseFloat(avg.toFixed(2))],
    ['최고 점수', Math.max(...totalScores)],
    ['최저 점수', Math.min(...totalScores)],
    ['표준편차', parseFloat(stdev.toFixed(2))],
    ['응시율', `${submitRate}%`],
    ['채점 완료율', `${gradeRate}%`],
    ['Cronbach α', cronbach],
  ]
  const ws2 = XLSX.utils.aoa_to_sheet(rows2)
  ws2['!cols'] = [{ wch: 16 }, { wch: 30 }]
  const hCell = ws2[XLSX.utils.encode_cell({ r: 0, c: 0 })]
  if (hCell) hCell.s = { font: { bold: true } }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws1, '문항 분석')
  XLSX.utils.book_append_sheet(wb, ws2, '퀴즈 요약')
  XLSX.writeFile(wb, `문항분석_${quiz.title}.xlsx`)
}

// ── 성적 다운로드 (QuizStats) ───────────────────────────────────────────────
export function downloadGradesXlsx(quiz, students) {
  const headers = ['이름', '학번', '학과', '제출일시', `점수 (/${quiz.totalPoints}점)`, '자동채점', '수동채점', '채점 상태']
  const rows = students.map(s => {
    const autoTotal = s.autoScores ? Object.values(s.autoScores).reduce((a, b) => a + b, 0) : ''
    const manualTotal = s.manualScores ? Object.values(s.manualScores).reduce((a, b) => a + b, 0) : ''
    return [
      s.name,
      s.studentId,
      s.department,
      s.submittedAt ?? '',
      s.score ?? '',
      autoTotal,
      manualTotal,
      s.score !== null && s.score !== undefined ? '채점 완료' : '미채점',
    ]
  })

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]
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
  const headers = ['이름', '학번', '학과', '제출일시', ...qHeaders, '자동채점합계', '수동채점합계', '총점']

  const mockRows = students.map((s, idx) => {
    const answers = questions.map(q => (getStudentAnswer ? getStudentAnswer(idx, q.id) : '') ?? '')
    const autoTotal = s.autoScores ? Object.values(s.autoScores).reduce((a, b) => a + b, 0) : ''
    const manualTotal = s.manualScores ? Object.values(s.manualScores).reduce((a, b) => a + b, 0) : ''
    return [s.name, s.studentId, s.department, s.submittedAt ?? '', ...answers, autoTotal, manualTotal, s.score ?? '']
  })

  const localRows = localAttempts.map(attempt => {
    const answers = questions.map(q => attempt.answers?.[q.id] ?? '')
    const autoTotal = attempt.totalAutoScore ?? ''
    return [attempt.studentName, attempt.studentNumber, attempt.department, attempt.submittedAt ?? '', ...answers, autoTotal, '', autoTotal]
  })

  const allRows = [...mockRows, ...localRows]
  const ws = XLSX.utils.aoa_to_sheet([headers, ...allRows])
  ws['!views'] = [{}]

  // 컬럼 너비
  const colWidths = [{ wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 18 }]
  questions.forEach(() => colWidths.push({ wch: 16 }))
  colWidths.push({ wch: 12 }, { wch: 12 }, { wch: 8 })
  ws['!cols'] = colWidths
  headers.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })]
    if (cell) cell.s = { font: { bold: true } }
  })

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

// ── 채점 양식 파싱 (ExcelModal 업로드) ───────────────────────────────────
// 반환: Promise<{ rows: [{studentId, name, score}], error }>
// 채점 양식 컬럼: 이름(0), 학번(1), 학과(2), 현재점수(3), 새점수(4)
export function parseGradingSheet(file) {
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
        const rows = []
        for (let i = 1; i < raw.length; i++) {
          const row = raw[i].map(v => String(v ?? '').trim())
          const name = row[0]
          const studentId = row[1]
          const newScoreRaw = row[4]
          if (!name && !studentId) continue // 빈 행
          if (newScoreRaw === '' || newScoreRaw === undefined) continue // 점수 미입력 행 건너뜀
          const score = Number(newScoreRaw)
          if (isNaN(score) || score < 0) {
            resolve({ error: `${i + 1}행: 점수는 0 이상의 숫자여야 합니다.` })
            return
          }
          rows.push({ name, studentId, score })
        }
        if (rows.length === 0) {
          resolve({ error: '새 점수가 입력된 행이 없습니다.' })
          return
        }
        resolve({ rows })
      } catch {
        resolve({ error: '파일을 읽을 수 없습니다.' })
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

// ── 문항 업로드 템플릿 다운로드 (QuestionBank) ───────────────────────────

// 엑셀 업로드로 지원하는 유형 (단순 행 구조로 표현 가능한 유형만)
const EXCEL_SUPPORTED_TYPES = ['multiple_choice', 'true_false', 'multiple_answers', 'short_answer', 'essay']

export function downloadQuestionTemplate() {
  const headers = ['유형', '문항 내용', '배점', '난이도(선택)', '정답(선택)', '보기1', '보기2', '보기3', '보기4', '보기5']
  const exampleRows = [
    ['multiple_choice', 'SQL에서 테이블을 생성하는 명령어는?', 5, 'medium', 'CREATE TABLE', 'SELECT', 'INSERT', 'CREATE TABLE', 'DROP', ''],
    ['true_false', 'PRIMARY KEY는 NULL 값을 허용한다.', 5, 'low', '거짓', '', '', '', '', ''],
    ['multiple_answers', '다음 중 DDL에 해당하는 명령어를 모두 고르시오.', 10, 'medium', 'CREATE, ALTER, DROP', 'CREATE', 'ALTER', 'DROP', 'SELECT', 'INSERT'],
    ['short_answer', 'DDL의 약자를 쓰시오.', 5, 'medium', 'Data Definition Language', '', '', '', '', ''],
    ['essay', '트랜잭션의 ACID 속성에 대해 서술하시오.', 15, 'high', '', '', '', '', '', ''],
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows])
  ws['!cols'] = [{ wch: 24 }, { wch: 40 }, { wch: 8 }, { wch: 14 }, { wch: 25 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }]
  headers.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })]
    if (cell) cell.s = { font: { bold: true } }
  })

  // 두 번째 시트: 엑셀 업로드 지원 유형 코드
  const typeHeaders = ['유형 코드', '한국어 이름', '자동채점 여부', '비고']
  const supportedRows = EXCEL_SUPPORTED_TYPES.map(k => [
    k,
    QUIZ_TYPES[k].label,
    QUIZ_TYPES[k].autoGrade === true ? '자동' : QUIZ_TYPES[k].autoGrade === 'partial' ? '부분 자동' : '수동',
    '',
  ])
  const unsupportedRows = Object.entries(QUIZ_TYPES)
    .filter(([k]) => !EXCEL_SUPPORTED_TYPES.includes(k))
    .map(([k, v]) => [
      k,
      v.label,
      v.autoGrade === true ? '자동' : v.autoGrade === 'partial' ? '부분 자동' : '수동',
      'UI 에디터에서만 생성 가능',
    ])
  const ws2 = XLSX.utils.aoa_to_sheet([typeHeaders, ...supportedRows, ...unsupportedRows])
  ws2['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 28 }]

  // 세 번째 시트: 난이도 코드 안내
  const diffHeaders = ['난이도 코드', '한국어 이름', '설명']
  const diffRows = [
    ['high', '상', '고난도 문항 (상위 개념, 응용/분석 수준)'],
    ['medium', '중', '기본 문항 (핵심 개념 이해 수준) — 기본값'],
    ['low', '하', '입문 문항 (단순 암기, 기초 확인 수준)'],
  ]
  const ws3 = XLSX.utils.aoa_to_sheet([diffHeaders, ...diffRows])
  ws3['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 36 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '문항 데이터')
  XLSX.utils.book_append_sheet(wb, ws2, '유효한 유형 코드')
  XLSX.utils.book_append_sheet(wb, ws3, '난이도 코드')
  XLSX.writeFile(wb, '문항_업로드_템플릿.xlsx')
}

// ── 엑셀/CSV 파싱 (QuestionBank 업로드) ───────────────────────────────────
export function parseExcelOrCsv(file) {
  return new Promise((resolve) => {
    if (file.size > 5 * 1024 * 1024) {
      resolve({ error: '파일 크기가 5MB를 초과합니다.' })
      return
    }

    const isCsv = file.name.toLowerCase().endsWith('.csv')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        let wb
        if (isCsv) {
          // CSV는 UTF-8 텍스트로 읽어서 BOM 제거 후 파싱
          const text = ev.target.result.replace(/^\uFEFF/, '')
          wb = XLSX.read(text, { type: 'string' })
        } else {
          wb = XLSX.read(ev.target.result, { type: 'array' })
        }
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        if (raw.length < 2) {
          resolve({ error: '데이터 행이 없습니다.' })
          return
        }

        const validTypes = Object.keys(QUIZ_TYPES) // 전체 유형 (오류 메시지 힌트용)
        const rows = []
        const errors = []

        for (let i = 1; i < raw.length; i++) {
          const [typeRaw, textRaw, pointsRaw, difficultyRaw = '', answer = '', c1 = '', c2 = '', c3 = '', c4 = '', c5 = ''] = raw[i].map(v => String(v ?? '').trim())
          const rowNum = i + 1

          if (!typeRaw && !textRaw && !pointsRaw) continue // 빈 행 건너뜀

          let rowHasError = false

          if (!EXCEL_SUPPORTED_TYPES.includes(typeRaw)) {
            const isKnownType = validTypes.includes(typeRaw)
            const hint = isKnownType ? ' (UI 에디터에서만 생성 가능)' : ''
            errors.push(`${rowNum}행: 지원하지 않는 유형 "${typeRaw}"${hint}`)
            rowHasError = true
          }
          if (!textRaw) {
            errors.push(`${rowNum}행: 문항 내용이 비어있습니다`)
            rowHasError = true
          }
          const points = parseInt(pointsRaw, 10)
          if (isNaN(points) || points <= 0) {
            errors.push(`${rowNum}행: 배점이 유효하지 않습니다 (양의 정수여야 합니다)`)
            rowHasError = true
          }

          if (!rowHasError && (typeRaw === 'multiple_choice' || typeRaw === 'multiple_answers')) {
            const choices = [c1, c2, c3, c4, c5].filter(Boolean)
            if (choices.length < 2) {
              errors.push(`${rowNum}행: ${typeRaw === 'multiple_choice' ? '객관식' : '복수 선택'} 문항은 보기를 2개 이상 입력해야 합니다`)
              rowHasError = true
            }
          }

          if (!rowHasError && typeRaw === 'multiple_answers') {
            if (!answer) {
              errors.push(`${rowNum}행: 복수 선택 문항은 정답을 입력해야 합니다 (쉼표로 구분)`)
              rowHasError = true
            } else {
              const choiceList = [c1, c2, c3, c4, c5].filter(Boolean)
              const choiceListLower = choiceList.map(c => c.toLowerCase())
              const answerList = answer.split(',').map(s => s.trim()).filter(Boolean)
              const invalid = answerList.filter(a => !choiceListLower.includes(a.toLowerCase()))
              if (invalid.length > 0) {
                errors.push(`${rowNum}행: 정답 "${invalid.join(', ')}"이(가) 보기에 없습니다`)
                rowHasError = true
              }
            }
          }

          if (!rowHasError && typeRaw === 'short_answer' && !answer) {
            errors.push(`${rowNum}행: 단답형 문항은 정답을 입력해야 합니다`)
            rowHasError = true
          }

          if (rowHasError) continue

          const validDifficulties = ['high', 'medium', 'low']
          const difficulty = validDifficulties.includes(difficultyRaw) ? difficultyRaw : 'medium'

          const choices = [c1, c2, c3, c4, c5].filter(Boolean)
          rows.push({ type: typeRaw, text: textRaw, points, difficulty, answer, choices })
        }

        if (errors.length > 0) {
          resolve({ errors })
          return
        }

        if (rows.length === 0) {
          resolve({ errors: ['데이터 행이 없습니다.'] })
          return
        }

        resolve({ rows })
      } catch {
        resolve({ error: '파일을 읽을 수 없습니다. 파일이 손상되었거나 지원하지 않는 형식입니다.' })
      }
    }
    if (isCsv) {
      reader.readAsText(file, 'utf-8')
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}
