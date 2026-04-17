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
  } catch {}
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
  } catch {}
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
