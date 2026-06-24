// XQ-D-09 R-006: 재채점(D-06)으로 학생 점수가 변경되면 결과 화면에
// "점수가 조정되었습니다" 안내와 갱신된 점수를 표시한다.
// 재채점 경로(추가 인정 답안·정답 수정 재채점)에서 학생별 조정 기록을 남기고,
// 학생 결과 화면(StudentResultSection)이 이를 읽어 안내·갱신 점수를 노출한다.

const KEY = 'xnq_score_adjustments'

export function getScoreAdjustments() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

// 한 학생의 점수 조정 기록 (quizId·studentId 단위, 최신 1건 유지)
export function recordScoreAdjustment(quizId, studentId, newScore, at) {
  if (quizId == null || studentId == null) return
  try {
    const all = getScoreAdjustments()
    if (!all[quizId]) all[quizId] = {}
    all[quizId][studentId] = { at: at ?? new Date().toISOString(), newScore }
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

export function getStudentAdjustment(quizId, studentId) {
  if (quizId == null || studentId == null) return null
  return getScoreAdjustments()[quizId]?.[studentId] ?? null
}
