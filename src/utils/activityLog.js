// 응시 활동 로그
// 학생이 응시 중 수행한 행동(시작, 문항 이동, 답변 변경, 포커스 이탈, 자동 저장, 제출)을 기록.
// localStorage 기반 단순 append-only. 엔트리 수가 상한을 넘으면 앞에서부터 잘라낸다.

const LOG_KEY_PREFIX = 'xnq_activity_log_'
const MAX_ENTRIES = 500

export const ACTIVITY_TYPES = {
  START: 'start',
  NAVIGATE: 'navigate',
  ANSWER_CHANGE: 'answer_change',
  FOCUS_LOSS: 'focus_loss',
  FOCUS_GAIN: 'focus_gain',
  AUTOSAVE: 'autosave',
  SUBMIT: 'submit',
}

export function buildActivityLogKey(quizId, studentId) {
  if (!quizId || !studentId) return null
  return `${LOG_KEY_PREFIX}${quizId}_${studentId}`
}

export function loadActivityLog(key) {
  if (!key) return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function appendActivityLog(key, entry) {
  if (!key || !entry || !entry.type) return
  try {
    const list = loadActivityLog(key)
    list.push({ ts: Date.now(), ...entry })
    if (list.length > MAX_ENTRIES) list.splice(0, list.length - MAX_ENTRIES)
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // 저장 실패 시 무시 (autosave quota 경고가 별도로 표시됨)
  }
}

export function clearActivityLog(key) {
  if (!key) return
  try { localStorage.removeItem(key) } catch { /* ignore */ }
}

// 요약 통계: 시작/제출 시각, 총 소요 시간(초), 포커스 이탈 횟수, 답변 변경 횟수
export function summarizeActivityLog(log) {
  const summary = {
    startedAt: null,
    submittedAt: null,
    durationSec: null,
    focusLossCount: 0,
    answerChangeCount: 0,
    navigateCount: 0,
    autoSubmitted: false,
    entryCount: log.length,
  }
  for (const e of log) {
    if (e.type === ACTIVITY_TYPES.START && summary.startedAt == null) summary.startedAt = e.ts
    else if (e.type === ACTIVITY_TYPES.SUBMIT) {
      summary.submittedAt = e.ts
      if (e.auto) summary.autoSubmitted = true
    }
    else if (e.type === ACTIVITY_TYPES.FOCUS_LOSS) summary.focusLossCount++
    else if (e.type === ACTIVITY_TYPES.ANSWER_CHANGE) summary.answerChangeCount++
    else if (e.type === ACTIVITY_TYPES.NAVIGATE) summary.navigateCount++
  }
  if (summary.startedAt && summary.submittedAt) {
    summary.durationSec = Math.max(0, Math.floor((summary.submittedAt - summary.startedAt) / 1000))
  }
  return summary
}
