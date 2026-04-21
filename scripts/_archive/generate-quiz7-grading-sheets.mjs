/**
 * Quiz 7 일괄채점 샘플 파일 생성
 * 실행: node scripts/generate-quiz7-grading-sheets.mjs
 *
 * mockStudents 기준 82명, 문항 3개(q7_1~q7_3, 각 10점) 각각 파일 생성
 */

import * as XLSX from 'xlsx'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// mockData.js 와 동일한 학생 생성 로직
const DEMO_NAMES = ['학생 A', '학생 B', '학생 C', '학생 D', '학생 E', '학생 F',
                    '학생 G', '학생 H', '학생 I', '학생 J', '학생 K', '학생 L']
const DEPARTMENTS = ['컴퓨터공학과', '소프트웨어학과', '정보통신공학과', '데이터사이언스학과']

const students = Array.from({ length: 82 }, (_, i) => ({
  name:       DEMO_NAMES[i % 12] + (i > 11 ? `-${Math.floor(i / 12) + 1}` : ''),
  studentId:  `2022${String(i + 1001).slice(1)}`,
  department: DEPARTMENTS[i % 4],
}))

// 문항별 점수 패턴 (0~10점, 제출한 117명 중 82명 기준)
const SCORE_PATTERNS = {
  q7_1: [8, 7, 9, 6, 10, 7, 8, 9, 7, 8, 6, 9, 8, 7, 10, 6, 9, 8, 7, 9,
          8, 6, 10, 7, 8, 9, 7, 8, 6, 9, 8, 10, 7, 8, 9, 6, 8, 7, 9, 8,
          10, 6, 9, 8, 7, 8, 9, 7, 6, 10, 8, 9, 7, 8, 6, 9, 8, 7, 10, 8,
          9, 6, 8, 7, 9, 8, 10, 7, 8, 9, 6, 8, 7, 9, 8, 6, 10, 9, 7, 8, 9, 7],
  q7_2: [7, 6, 8, 9, 7, 10, 6, 8, 7, 9, 6, 8, 7, 9, 6, 10, 7, 8, 9, 6,
          7, 9, 8, 6, 10, 7, 8, 9, 6, 7, 9, 8, 10, 6, 7, 8, 9, 6, 7, 10,
          8, 9, 6, 7, 9, 6, 8, 10, 7, 9, 6, 8, 9, 6, 10, 7, 9, 8, 6, 9,
          7, 8, 9, 6, 8, 7, 9, 8, 6, 10, 9, 7, 8, 6, 9, 7, 8, 6, 10, 9, 7, 8],
  q7_3: [9, 8, 7, 10, 8, 6, 9, 7, 10, 8, 9, 7, 8, 10, 7, 9, 6, 8, 10, 7,
          9, 8, 7, 10, 8, 9, 6, 7, 10, 8, 9, 7, 8, 6, 10, 9, 7, 8, 9, 7,
          6, 10, 8, 9, 8, 9, 7, 6, 10, 8, 7, 9, 6, 10, 8, 9, 7, 10, 8, 7,
          8, 10, 7, 9, 7, 9, 8, 6, 10, 8, 7, 9, 10, 8, 7, 9, 7, 10, 8, 6, 8, 9],
}

const QUESTIONS = [
  { id: 'q7_1', order: 1, maxPoints: 10 },
  { id: 'q7_2', order: 2, maxPoints: 10 },
  { id: 'q7_3', order: 3, maxPoints: 10 },
]

function makeSheet(question) {
  const headers = ['이름', '학번', '학과', '현재 점수', `새 점수 (0~${question.maxPoints}점 입력)`]
  const scores = SCORE_PATTERNS[question.id]
  const rows = students.map((s, i) => [
    s.name,
    s.studentId,
    s.department,
    '',
    scores[i],
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 24 }]
  headers.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })]
    if (cell) cell.s = { font: { bold: true } }
  })
  return ws
}

const outDir = path.resolve(__dirname, '../public/samples')
fs.mkdirSync(outDir, { recursive: true })

QUESTIONS.forEach(q => {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, makeSheet(q), '채점양식')
  const out = path.join(outDir, `quiz7_Q${q.order}_일괄채점.xlsx`)
  XLSX.writeFile(wb, out)
  console.log(`생성: ${out}`)
})

console.log('\n완료. public/samples/ 에서 확인하세요.')
