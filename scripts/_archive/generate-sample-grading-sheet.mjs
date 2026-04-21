/**
 * 일괄 채점 샘플 파일 생성 스크립트
 * 실행: node scripts/generate-sample-grading-sheet.mjs
 *
 * parseGradingSheet 컬럼 구조:
 *   [0] 이름  [1] 학번  [2] 학과  [3] 현재 점수  [4] 새 점수
 */

import * as XLSX from 'xlsx'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── mock 학생 데이터 (mockData.js 기준 그대로) ─────────────────────────────
const DEMO_NAMES = ['학생 A', '학생 B', '학생 C', '학생 D', '학생 E', '학생 F',
                    '학생 G', '학생 H', '학생 I', '학생 J', '학생 K', '학생 L']
const DEPARTMENTS = ['컴퓨터공학과', '소프트웨어학과', '정보통신공학과', '데이터사이언스학과']

function makeStudents(n = 12) {
  return Array.from({ length: n }, (_, i) => ({
    name: DEMO_NAMES[i % 12] + (i > 11 ? `-${Math.floor(i / 12) + 1}` : ''),
    studentId: `2022${String(i + 1001).slice(1)}`,
    department: DEPARTMENTS[i % 4],
  }))
}

// ── 케이스 1: 일반 채점 양식 (새 점수 모두 입력, 만점 10점짜리 문항 기준) ──
function buildNormal(students, maxPoints = 10) {
  const headers = ['이름', '학번', '학과', '현재 점수', `새 점수 (0~${maxPoints}점 입력)`]
  // 현재 점수: 일부 채점된 상태, 새 점수: 테스트용 점수 (비어있지 않음)
  const sampleScores = [8, 6, 10, 7, 9, 5, 8, 4, 10, 6, 7, 9]
  const rows = students.map((s, i) => [
    s.name,
    s.studentId,
    s.department,
    '',                             // 현재 점수 없음(미채점 상태)
    sampleScores[i % sampleScores.length],  // 새 점수
  ])
  return { headers, rows }
}

// ── 케이스 2: 일부만 점수 입력 (빈 행 건너뜀 동작 검증용) ────────────────
function buildPartial(students, maxPoints = 10) {
  const headers = ['이름', '학번', '학과', '현재 점수', `새 점수 (0~${maxPoints}점 입력)`]
  const scores   = [7, '', 9, '', 10, 6, '', 8, '', 5, 7, '']  // 빈 값 = 건너뜀
  const rows = students.map((s, i) => [
    s.name,
    s.studentId,
    s.department,
    '',
    scores[i % scores.length],
  ])
  return { headers, rows }
}

// ── 케이스 3: 오류 케이스 (음수, 문자열 점수 포함 → 파싱 오류 검증용) ────
function buildWithErrors(students, maxPoints = 10) {
  const headers = ['이름', '학번', '학과', '현재 점수', `새 점수 (0~${maxPoints}점 입력)`]
  const scores   = [8, -1, '우수', 7, 99, 6, 8, 4, 10, 6, 7, 9]  // -1, 문자, 범위초과 포함
  const rows = students.map((s, i) => [
    s.name,
    s.studentId,
    s.department,
    '',
    scores[i % scores.length],
  ])
  return { headers, rows }
}

// ── 케이스 4: 현재 점수 있음 (덮어쓰기 동작 확인용) ─────────────────────
function buildOverwrite(students, maxPoints = 10) {
  const headers = ['이름', '학번', '학과', '현재 점수', `새 점수 (0~${maxPoints}점 입력)`]
  const current = [5, 3, 8, 6, 4, 7, 5, 2, 9, 6, 3, 7]
  const updated = [8, 6, 10, 7, 9, 8, 8, 5, 10, 7, 6, 9]
  const rows = students.map((s, i) => [
    s.name,
    s.studentId,
    s.department,
    current[i % current.length],
    updated[i % updated.length],
  ])
  return { headers, rows }
}

// ── 시트 빌더 ─────────────────────────────────────────────────────────────
function makeSheet({ headers, rows }) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 24 }]
  headers.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })]
    if (cell) cell.s = { font: { bold: true } }
  })
  return ws
}

// ── 출력 ──────────────────────────────────────────────────────────────────
const students = makeStudents(12)
const outDir   = path.resolve(__dirname, '../public/samples')
fs.mkdirSync(outDir, { recursive: true })

// 파일 1: 정상 케이스 (새 점수 전체 입력)
const wb1 = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb1, makeSheet(buildNormal(students, 10)), '채점양식')
const out1 = path.join(outDir, '샘플_일괄채점_정상.xlsx')
XLSX.writeFile(wb1, out1)
console.log(`생성: ${out1}`)

// 파일 2: 부분 입력 (일부 빈칸)
const wb2 = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb2, makeSheet(buildPartial(students, 10)), '채점양식')
const out2 = path.join(outDir, '샘플_일괄채점_부분입력.xlsx')
XLSX.writeFile(wb2, out2)
console.log(`생성: ${out2}`)

// 파일 3: 오류 케이스 (음수/문자/범위초과)
const wb3 = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb3, makeSheet(buildWithErrors(students, 10)), '채점양식')
const out3 = path.join(outDir, '샘플_일괄채점_오류케이스.xlsx')
XLSX.writeFile(wb3, out3)
console.log(`생성: ${out3}`)

// 파일 4: 덮어쓰기 케이스 (현재 점수 → 새 점수)
const wb4 = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb4, makeSheet(buildOverwrite(students, 10)), '채점양식')
const out4 = path.join(outDir, '샘플_일괄채점_덮어쓰기.xlsx')
XLSX.writeFile(wb4, out4)
console.log(`생성: ${out4}`)

console.log('\n완료. public/samples/ 에서 확인하세요.')
