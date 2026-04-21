/**
 * Attempts 데이터 레이어 (응시)
 *
 * 주의 — mock 과 api 응답 구조가 다름:
 *   mock (getQuizStudents): [{ id, name, studentId, department, score, submitted, response, autoScores, manualScores, ... }]
 *   api  (GET /attempts): [{ id, quizId, userId, autoScore, manualScore, totalScore, submitted, user: {...}, ... }]
 *
 * listStudentsInQuiz() 는 GradingDashboard 용 구조로 통일. 다음 단계에서 이 둘을 매핑.
 */
import { api } from '@/lib/api'
import { MODE, normalizeDate as fmtDate } from './_common'
import { getQuizStudents as mockGetStudents, getStudentAttempts as mockGetAttempts } from '@/data/mockData'

// api attempt[] → GradingDashboard 가 기대하는 학생-중심 shape 으로 집계
// 학생당 1행 — 제출된 것 중 attemptNumber 가장 높은 것 선택, 없으면 가장 최근 미제출 것
function mapAttemptsToStudents(attempts) {
  const byUser = new Map()
  for (const att of attempts) {
    const uid = att.userId
    const prev = byUser.get(uid)
    if (!prev) { byUser.set(uid, att); continue }
    const preferCurrent =
      (att.submitted && !prev.submitted) ||
      (att.submitted === prev.submitted && (att.attemptNumber ?? 0) > (prev.attemptNumber ?? 0))
    if (preferCurrent) byUser.set(uid, att)
  }

  return Array.from(byUser.values()).map(att => {
    const selections = {}
    const autoScores = {}
    const manualScores = {}
    let hasManual = false
    for (const a of att.answers ?? []) {
      if (a.response !== undefined) selections[a.questionId] = a.response
      if (a.autoScore !== null && a.autoScore !== undefined) autoScores[a.questionId] = a.autoScore
      if (a.manualScore !== null && a.manualScore !== undefined) {
        manualScores[a.questionId] = a.manualScore
        hasManual = true
      }
    }
    return {
      id: att.userId,
      studentId: att.user?.studentId ?? '',
      name: att.user?.name ?? '',
      department: att.user?.department ?? '',
      score: att.totalScore,
      submitted: !!att.submitted,
      submittedAt: fmtDate(att.submittedAt),
      startTime: fmtDate(att.startTime),
      endTime: fmtDate(att.submittedAt),
      response: null,
      selections,
      autoScores,
      manualScores: hasManual ? manualScores : null,
      attemptId: att.id,
      attemptNumber: att.attemptNumber,
    }
  })
}

export async function listAttempts(params = {}) {
  if (MODE === 'api') {
    const qs = new URLSearchParams(params).toString()
    const rows = await api('/api/attempts' + (qs ? '?' + qs : ''))
    // quizId 조회일 때만 학생-중심 shape 으로 집계 (GradingDashboard 호환)
    return params.quizId ? mapAttemptsToStudents(rows) : rows
  }
  // mock 모드에선 quizId 필수 — getQuizStudents 재활용
  if (params.quizId) return mockGetStudents(params.quizId)
  return []
}

export async function getAttempt(id) {
  if (MODE === 'api') return await api(`/api/attempts/${id}`)
  // mock 에는 개별 attempt id 조회가 없어 — 지원 안 함
  throw new Error('getAttempt: mock 모드 미지원')
}

export async function startAttempt(quizId) {
  if (MODE === 'api') {
    return await api('/api/attempts', {
      method: 'POST', body: JSON.stringify({ quizId }),
    })
  }
  // mock: 단순히 신규 응시 객체 반환 (로컬 상태만 관리)
  return { id: 'local_' + Date.now(), quizId, startTime: new Date().toISOString(), submitted: false }
}

export async function saveAnswers(attemptId, answers) {
  if (MODE === 'api') {
    return await api(`/api/attempts/${attemptId}/answers`, {
      method: 'PUT', body: JSON.stringify({ answers }),
    })
  }
  // mock: 단순 echo
  return { saved: answers.length }
}

export async function submitAttempt(attemptId) {
  if (MODE === 'api') {
    return await api(`/api/attempts/${attemptId}/submit`, { method: 'POST' })
  }
  return { id: attemptId, submitted: true, submittedAt: new Date().toISOString() }
}

export async function gradeAttempt(attemptId, grades) {
  if (MODE === 'api') {
    return await api(`/api/attempts/${attemptId}`, {
      method: 'PATCH', body: JSON.stringify({ grades }),
    })
  }
  throw new Error('gradeAttempt: mock 모드는 regradeQuestion 경로 사용')
}

/** 학생 개인의 퀴즈 응시 이력 (mockData getStudentAttempts 대응) */
export async function getMyAttempts(quizId) {
  if (MODE === 'api') return await api(`/api/attempts?quizId=${quizId}`)
  return mockGetAttempts(quizId)
}
