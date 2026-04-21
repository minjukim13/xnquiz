// 결과 화면 조회 이력 — 학생이 자신의 응시 결과를 확인한 시점을 attemptId 별로 기록
const RESULTS_VIEWED_KEY = 'xnq_results_viewed'

export function isResultViewed(attemptId) {
  if (!attemptId) return false
  try {
    const map = JSON.parse(localStorage.getItem(RESULTS_VIEWED_KEY) || '{}')
    return !!map[attemptId]
  } catch {
    return false
  }
}

export function markResultViewed(attemptId) {
  if (!attemptId) return
  try {
    const map = JSON.parse(localStorage.getItem(RESULTS_VIEWED_KEY) || '{}')
    if (map[attemptId]) return
    map[attemptId] = new Date().toISOString()
    localStorage.setItem(RESULTS_VIEWED_KEY, JSON.stringify(map))
  } catch { /* ignore */ }
}
