export function getLocalGrades() {
  try {
    const raw = localStorage.getItem('xnq_manual_grades')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function setLocalGrades(grades) {
  try {
    localStorage.setItem('xnq_manual_grades', JSON.stringify(grades))
  } catch {
    // QuotaExceededError 등 무시
  }
}

export function getLocalComments() {
  try {
    const raw = localStorage.getItem('xnq_student_comments')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function setLocalComments(comments) {
  try {
    localStorage.setItem('xnq_student_comments', JSON.stringify(comments))
  } catch { /* quota exceeded 등 무시 */ }
}

export function getLocalFudgePoints() {
  try {
    const raw = localStorage.getItem('xnq_fudge_points')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function setLocalFudgePoints(fudge) {
  try {
    localStorage.setItem('xnq_fudge_points', JSON.stringify(fudge))
  } catch { /* quota exceeded 등 무시 */ }
}

// 학생별 문항 점수 초기값 계산 (저장된 값 > 수동 채점 > 자동 채점 > 빈 값)
// 반환: 숫자(채점됨) | '' (미채점)
export function getInitScore(student, question, quizId, autoCorrect) {
  const storageKey = `${quizId}_${student.id}_${question.id}`
  const grades = getLocalGrades()
  if (storageKey in grades) return grades[storageKey]
  if (student.manualScores?.[question.id] != null) return student.manualScores[question.id]
  if (student.submitted && question.autoGrade) {
    return student.autoScores?.[question.id] ?? (autoCorrect ? question.points : 0)
  }
  return ''
}

// 실제 변경 여부: 미채점→숫자 입력은 항상 변경, 숫자→동일 숫자는 변경 아님
export function hasActualScoreChange(pendingScore, initScore) {
  if (pendingScore === undefined) return false
  if (pendingScore === '' || isNaN(Number(pendingScore)) || Number(pendingScore) < 0) return false
  if (initScore === '' || initScore === null || initScore === undefined) return true
  return Number(pendingScore) !== Number(initScore)
}

export const SORT_OPTIONS = [
  { value: 'ungraded_first', label: '미채점 우선' },
  { value: 'question_order', label: '문항 번호순' },
]

export const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10명씩' },
  { value: 20, label: '20명씩' },
  { value: 30, label: '30명씩' },
  { value: 'all', label: '전체' },
]
