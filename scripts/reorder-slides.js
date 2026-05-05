// Reference 슬라이드(1159-1287)를 Overview 슬라이드(1-439) 뒤로 이동
import { readFileSync, writeFileSync } from 'node:fs'

const path = 'XNQuizzes_구현현황_보고_v2.html'
const lines = readFileSync(path, 'utf8').split(/\r?\n/)
// 마지막 빈 줄 처리
const hasTrailing = lines[lines.length - 1] === ''
const arr = hasTrailing ? lines.slice(0, -1) : lines

// 1-based → 0-based
const A = arr.slice(0, 439)        // line 1-439: cover + Overview
const C = arr.slice(439, 1158)     // line 440-1158: AI Process ~ DS
const B = arr.slice(1158, 1287)    // line 1159-1287: Reference
const D = arr.slice(1287)          // line 1288~: Scope ~ end

const out = [...A, ...B, ...C, ...D]
const result = out.join('\n') + (hasTrailing ? '\n' : '')

writeFileSync(path, result, 'utf8')
console.log(`Done. Total lines: ${out.length}`)
console.log(`Reference 위치: line ${A.length + 1} ~ ${A.length + B.length}`)
