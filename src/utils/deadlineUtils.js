// 마감 판단 및 자동 제출 유틸리티
//
// Grace Period 같은 신규 정책이 도입돼도 호출부(getQuizStudents 등)를
// 수정하지 않도록, 마감 시점 판단을 이 파일로 일원화한다.

function addMinutes(date, minutes) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() + minutes)
  return d
}

function getGraceMinutes(quiz) {
  const g = Number(quiz?.gracePeriod)
  return Number.isFinite(g) && g > 0 ? g : 0
}

/**
 * 지각 여부 판단 기준 시점(= dueDate + gracePeriod)을 반환한다.
 * 이 시점 이내 제출은 지각으로 처리하지 않는다.
 * @param {object} quiz
 * @returns {Date | null}
 */
export function getLateThreshold(quiz) {
  if (!quiz?.dueDate) return null
  return addMinutes(quiz.dueDate, getGraceMinutes(quiz))
}

/**
 * 퀴즈의 실제 마감 시점을 반환한다.
 * - 기본: quiz.dueDate + gracePeriod
 * - 지각 제출 허용 + lateSubmitDeadline 설정 시: lateSubmitDeadline (최종 마감)
 * - 지각 제출 허용 + lateSubmitDeadline 없음(무제한): null (마감 없음)
 * @param {object} quiz
 * @returns {Date | null}
 */
export function getEffectiveDeadline(quiz) {
  if (!quiz?.dueDate) return null

  if (quiz.allowLateSubmit) {
    if (!quiz.lateSubmitDeadline) return null
    return new Date(quiz.lateSubmitDeadline)
  }

  return addMinutes(quiz.dueDate, getGraceMinutes(quiz))
}

/**
 * 현재 시각이 지각 기준 시점을 지났는지 여부.
 * dueDate + gracePeriod 이후에 true를 반환한다.
 * @param {object} quiz
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isLateSubmission(quiz, now = new Date()) {
  const threshold = getLateThreshold(quiz)
  if (!threshold) return false
  return now > threshold
}

/**
 * 현재 시각 기준 마감이 지났는지 여부.
 * @param {object} quiz
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isDeadlinePassed(quiz, now = new Date()) {
  const deadline = getEffectiveDeadline(quiz)
  if (!deadline) return false
  return now >= deadline
}

// 'YYYY-MM-DD HH:mm:ss' 포맷 문자열
function formatDateTime(date) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * 마감 경과 시 미제출 학생 중 "응시 시작 후 미완료" 상태의 학생만
 * 자동 제출 처리하여 새 배열로 반환한다. (Canvas 동작 기준)
 * - 자동 제출 학생: 보유한 partial selections/autoScores를 그대로 제출,
 *   자동채점 점수는 입력된 답안 기준으로 집계, 수동채점은 미채점 상태로 대기
 * - `startTime`이 null인(응시 미시작) 학생은 그대로 미제출 유지
 *   → 교수자가 수동으로 일괄 제출 처리해야 0점으로 확정됨
 * - 이미 제출한 학생은 그대로 유지
 * - 마감 미경과 또는 마감 없음: 원본 배열 그대로 반환
 * @param {Array} students
 * @param {object} quiz
 * @param {Date} [now]
 * @returns {Array}
 */
export function autoSubmitExpiredStudents(students, quiz, now = new Date()) {
  if (!Array.isArray(students) || students.length === 0) return students
  if (!isDeadlinePassed(quiz, now)) return students

  const deadline = getEffectiveDeadline(quiz)
  const submittedAt = formatDateTime(deadline)

  return students.map(s => {
    if (s.submitted) return s
    if (!s.startTime) return s // 응시 미시작자는 자동 제출 대상 아님

    const autoTotal = Object.values(s.autoScores || {}).reduce((a, b) => a + (Number(b) || 0), 0)
    const hasManualPending = Object.keys(s.manualScores || {}).length === 0

    return {
      ...s,
      submitted: true,
      submittedAt,
      endTime: submittedAt.slice(0, 16),
      autoSubmitted: true,
      // 수동채점 문항이 채점 전 상태이면 최종 점수는 미확정(null), 아니면 자동+수동 합
      score: hasManualPending ? null : autoTotal + Object.values(s.manualScores).reduce((a, b) => a + (Number(b) || 0), 0),
    }
  })
}

/**
 * 자동 제출 반영 후의 유효 제출 인원을 반환한다.
 * students 배열을 함께 넘기면 실제 자동 제출 대상(응시 시작자)만 카운트한다.
 * @param {object} quiz
 * @param {Array} [students] - getQuizStudents 반환값. 미지정 시 quiz.submitted 사용
 * @param {Date} [now]
 * @returns {number}
 */
export function getEffectiveSubmittedCount(quiz, students, now = new Date()) {
  if (!quiz) return 0
  const base = quiz.submitted ?? 0
  if (!isDeadlinePassed(quiz, now)) return base
  if (Array.isArray(students) && students.length > 0) {
    // students가 이미 autoSubmitExpiredStudents 적용된 상태라 가정
    return students.filter(s => s.submitted).length
  }
  return base
}
