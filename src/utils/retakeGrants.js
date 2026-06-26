// 추가 응시 기회(재응시) 부여 기록 공용 스토어
// ConditionalRetakeModal(조건부 일괄 부여)과 QuizMonitor(개별 부여)가 동일 키를 공유한다.

const STORAGE_KEY = 'xnq_conditional_retakes'

export function getRetakeRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveRetakeRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    /* ignore */
  }
}

export function getQuizGrants(quizId) {
  return getRetakeRecords()[quizId] || []
}

// 특정 학생의 누적 부여 현황 (없으면 null)
export function getStudentGrantSummary(quizId, studentId) {
  const grants = getQuizGrants(quizId).filter(g => g.studentId === studentId)
  if (grants.length === 0) return null
  const totalAttempts = grants.reduce((sum, g) => sum + (g.additionalAttempts || 0), 0)
  const last = grants[grants.length - 1]
  return { totalAttempts, count: grants.length, lastDeadline: last.retakeDeadline || null }
}

// 부여 기록 추가 후 해당 퀴즈의 전체 기록 반환
export function addRetakeGrant(quizId, grant) {
  const records = getRetakeRecords()
  records[quizId] = [...(records[quizId] || []), grant]
  saveRetakeRecords(records)
  return records[quizId]
}
