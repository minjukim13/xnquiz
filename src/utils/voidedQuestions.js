// 문항 무효화 - 채점 제외 (XQ-D-06 R-008)
// "채점 제외"된 문항은 총점(만점)과 학생 점수에서 그 문항 기여분을 제외한다.
// (전원 정답 처리는 별도로 full_points 재채점으로 처리되며 여기 저장 대상이 아니다.)
// mock 전용 — localStorage 'xnq_voided_questions': { [quizId]: [questionId, ...] }

const STORAGE_KEY = 'xnq_voided_questions'

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function getVoidedQuestions(quizId) {
  const all = readAll()
  return new Set(all[quizId] || [])
}

export function isQuestionVoided(quizId, questionId) {
  return getVoidedQuestions(quizId).has(questionId)
}

export function setQuestionVoided(quizId, questionId, voided) {
  try {
    const all = readAll()
    const set = new Set(all[quizId] || [])
    if (voided) set.add(questionId)
    else set.delete(questionId)
    all[quizId] = Array.from(set)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch { /* ignore */ }
}

// 채점 제외된 문항이 학생 점수·만점에서 차감해야 할 기여분 계산
// 반환: { pointsExcluded(만점에서 뺄 배점 합), scoreExcluded(그 학생 점수에서 뺄 합) }
export function getVoidedAdjustment(quizId, student, questions) {
  const voided = getVoidedQuestions(quizId)
  if (voided.size === 0) return { pointsExcluded: 0, scoreExcluded: 0 }
  let pointsExcluded = 0
  let scoreExcluded = 0
  for (const q of questions ?? []) {
    if (!voided.has(q.id)) continue
    pointsExcluded += q.points || 0
    const sc = student?.manualScores?.[q.id] ?? student?.autoScores?.[q.id] ?? 0
    scoreExcluded += sc || 0
  }
  return { pointsExcluded, scoreExcluded }
}
