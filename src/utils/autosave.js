// 응시 세션 자동 저장
// 현재는 localStorage 드라이버. 서버 전환 시 driver 객체만 교체하면 된다.
// (API 드라이버 예시: save/load/clear를 fetch 호출로 대체)

const SESSION_KEY_PREFIX = 'xnq_attempt_session_'
const SNAPSHOT_KEY_PREFIX = 'xnq_attempt_snapshot_'
export const AUTOSAVE_INTERVAL_MS = 30_000

function isQuotaError(err) {
  if (!err) return false
  if (err.name === 'QuotaExceededError') return true
  if (err.name === 'NS_ERROR_DOM_QUOTA_REACHED') return true
  if (err.code === 22 || err.code === 1014) return true
  return false
}

const localStorageDriver = {
  save(key, payload) {
    try {
      localStorage.setItem(key, JSON.stringify(payload))
      return { ok: true }
    } catch (err) {
      console.error('[autosave] 저장 실패:', err)
      return { ok: false, reason: isQuotaError(err) ? 'quota' : 'error' }
    }
  },
  load(key) {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  clear(key) {
    try {
      localStorage.removeItem(key)
    } catch { /* ignore */ }
  },
}

let driver = localStorageDriver

export function setAutosaveDriver(nextDriver) {
  driver = nextDriver
}

export function buildAttemptSessionKey(quizId, studentId) {
  if (!quizId || !studentId) return null
  return `${SESSION_KEY_PREFIX}${quizId}_${studentId}`
}

export function saveAttemptSession(key, data) {
  if (!key) return { ok: false, reason: 'no_key' }
  return driver.save(key, { ...data, savedAt: Date.now() })
}

export function loadAttemptSession(key) {
  if (!key) return null
  return driver.load(key)
}

export function clearAttemptSession(key) {
  if (!key) return
  driver.clear(key)
}

// 응시본(동결된 문제지) 저장소 — 세션(answers) 자동저장과 분리해 빈번한 덮어쓰기로 유실되지 않게 한다.
// 첫 문항 진입 시 1회 저장, 재진입 시 로드, 제출 시 정리.
export function buildAttemptSnapshotKey(quizId, studentId) {
  if (!quizId || !studentId) return null
  return `${SNAPSHOT_KEY_PREFIX}${quizId}_${studentId}`
}

export function saveAttemptSnapshot(key, snapshot) {
  if (!key) return { ok: false, reason: 'no_key' }
  return driver.save(key, snapshot)
}

export function loadAttemptSnapshot(key) {
  if (!key) return null
  return driver.load(key)
}

export function clearAttemptSnapshot(key) {
  if (!key) return
  driver.clear(key)
}
