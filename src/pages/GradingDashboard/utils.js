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

// ── 코멘트 thread (교수자 ↔ 학생 채팅) ─────────────────────────────────────
// localStorage 구조:
//   xnq_student_comments: {
//     [`${quizId}_${studentId}`]: {
//       messages: [{ id, sender: 'professor' | 'student', text, createdAt }],
//       lastReadByProfessor: ISO | null,
//       lastReadByStudent:   ISO | null,
//     }
//   }
// 구버전(단일 텍스트 string) 데이터는 첫 교수자 메시지로 마이그레이션.

const EMPTY_THREAD = Object.freeze({ messages: [], lastReadByProfessor: null, lastReadByStudent: null })

function readRawComments() {
  try {
    const raw = localStorage.getItem('xnq_student_comments')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeRawComments(obj) {
  try {
    localStorage.setItem('xnq_student_comments', JSON.stringify(obj))
  } catch { /* quota exceeded 등 무시 */ }
}

function migrateValue(val) {
  if (!val) return { ...EMPTY_THREAD }
  if (typeof val === 'string') {
    return {
      messages: val.trim() ? [{
        id: `legacy_${Date.now()}`,
        sender: 'professor',
        text: val,
        createdAt: new Date(0).toISOString(), // 마이그레이션 표시: epoch
      }] : [],
      lastReadByProfessor: null,
      lastReadByStudent: null,
    }
  }
  return {
    messages: Array.isArray(val.messages) ? val.messages : [],
    lastReadByProfessor: val.lastReadByProfessor ?? null,
    lastReadByStudent: val.lastReadByStudent ?? null,
  }
}

export function getCommentThread(quizId, studentId) {
  const all = readRawComments()
  const key = `${quizId}_${studentId}`
  return migrateValue(all[key])
}

export function appendCommentMessage(quizId, studentId, sender, text) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return null
  const all = readRawComments()
  const key = `${quizId}_${studentId}`
  const thread = migrateValue(all[key])
  const msg = {
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sender,
    text: trimmed,
    createdAt: new Date().toISOString(),
  }
  thread.messages = [...thread.messages, msg]
  // 본인 메시지를 보낸 시점 = 본인은 자동으로 읽은 상태로 처리
  if (sender === 'professor') thread.lastReadByProfessor = msg.createdAt
  else thread.lastReadByStudent = msg.createdAt
  all[key] = thread
  writeRawComments(all)
  return msg
}

export function markCommentThreadRead(quizId, studentId, role) {
  const all = readRawComments()
  const key = `${quizId}_${studentId}`
  const thread = migrateValue(all[key])
  const now = new Date().toISOString()
  if (role === 'professor') thread.lastReadByProfessor = now
  else thread.lastReadByStudent = now
  all[key] = thread
  writeRawComments(all)
}

// 상대방이 보낸 메시지 중 내가 마지막으로 읽은 시점 이후의 개수
export function getUnreadCount(quizId, studentId, role) {
  const thread = getCommentThread(quizId, studentId)
  const lastRead = role === 'professor' ? thread.lastReadByProfessor : thread.lastReadByStudent
  const otherSender = role === 'professor' ? 'student' : 'professor'
  const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0
  return thread.messages.filter(m => m.sender === otherSender && new Date(m.createdAt).getTime() > lastReadTime).length
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
