// 수식 엔진 (Canvas 호환 수학 함수 지원)
// AddQuestionModal, QuizAttempt, mockData에서 공용 사용

export const FORMULA_FUNCTIONS = {
  abs: Math.abs, acos: Math.acos, asin: Math.asin, atan: Math.atan,
  ceil: Math.ceil, cos: Math.cos, floor: Math.floor, ln: Math.log,
  log: (x, base = 10) => Math.log(x) / Math.log(base),
  max: Math.max, min: Math.min, round: Math.round,
  sin: Math.sin, sqrt: Math.sqrt, tan: Math.tan,
  fact: n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r },
  comb: (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return Math.round(r) },
  perm: (n, k) => { let r = 1; for (let i = 0; i < k; i++) r *= (n - i); return r },
  deg_to_rad: d => d * Math.PI / 180,
  rad_to_deg: r => r * 180 / Math.PI,
}
export const FORMULA_CONSTANTS = { pi: Math.PI, e: Math.E }
export const FORMULA_FN_NAMES = Object.keys(FORMULA_FUNCTIONS)
export const FORMULA_CONST_NAMES = Object.keys(FORMULA_CONSTANTS)

export function evalFormula(formula, varValues) {
  try {
    if (!formula.trim()) return null
    let expr = formula.trim()
    for (const fn of FORMULA_FN_NAMES) {
      expr = expr.replace(new RegExp(`\\b${fn}\\s*\\(`, 'g'), `__fn_${fn}(`)
    }
    for (const [name, val] of Object.entries(varValues)) {
      expr = expr.replace(new RegExp(`\\b${name}\\b`, 'g'), String(val))
    }
    for (const c of FORMULA_CONST_NAMES) {
      expr = expr.replace(new RegExp(`\\b${c}\\b`, 'g'), String(FORMULA_CONSTANTS[c]))
    }
    expr = expr.replace(/\^/g, '**')
    const cleaned = expr.replace(/__fn_[a-z_]+/g, '').replace(/\*\*/g, '')
    if (/[^0-9+\-*/().,\s]/.test(cleaned)) return null
    const fnEntries = FORMULA_FN_NAMES.map(fn => `const __fn_${fn} = __fns.${fn};`)
    // eslint-disable-next-line no-new-func
    const result = Function('__fns', `"use strict"; ${fnEntries.join(' ')} return (${expr})`)(FORMULA_FUNCTIONS)
    return isNaN(result) || !isFinite(result) ? null : result
  } catch { return null }
}

export function evalFormulaPreview(formula, variables) {
  const validVars = variables.filter(v => v.name.trim())
  if (!validVars.length || !formula.trim()) return null
  const varValues = {}
  for (const v of validVars) {
    varValues[v.name] = ((Number(v.min) || 1) + (Number(v.max) || 10)) / 2
  }
  return evalFormula(formula, varValues)
}

// 시드 기반 의사 난수 생성 (학생별 고정 값)
export function seededRandom(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

export function generateSolutions(variables, formula, count = 10) {
  const validVars = variables.filter(v => v.name.trim())
  if (!validVars.length || !formula.trim()) return []
  const solutions = []
  for (let i = 0; i < count; i++) {
    const rng = seededRandom(i * 9973 + 1)
    const varValues = {}
    for (const v of validVars) {
      const min = Number(v.min) || 1
      const max = Number(v.max) || 10
      const decimals = Number(v.decimals) || 0
      const raw = min + rng() * (max - min)
      varValues[v.name] = Number(raw.toFixed(decimals))
    }
    const answer = evalFormula(formula, varValues)
    if (answer !== null) {
      solutions.push({ index: i + 1, variables: { ...varValues }, answer })
    }
  }
  return solutions
}

// 학생별 변수값 할당 (studentId를 시드로 사용해 같은 학생 = 같은 값)
export function generateStudentVariables(variables, studentId) {
  const validVars = variables.filter(v => v.name.trim())
  if (!validVars.length) return {}
  // studentId 문자열을 숫자 시드로 변환
  let seed = 0
  const s = String(studentId || '0')
  for (let i = 0; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) >>> 0
  const rng = seededRandom(seed + 1)
  const varValues = {}
  for (const v of validVars) {
    const min = Number(v.min) || 1
    const max = Number(v.max) || 10
    const decimals = Number(v.decimals) || 0
    const raw = min + rng() * (max - min)
    varValues[v.name] = Number(raw.toFixed(decimals))
  }
  return varValues
}
