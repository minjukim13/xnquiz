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
import { getQuizStudents as mockGetStudents, getStudentAttempts as mockGetAttempts } from '@/data/mockData'

const MODE = import.meta.env.VITE_DATA_SOURCE ?? 'mock'

export async function listAttempts(params = {}) {
  if (MODE === 'api') {
    const qs = new URLSearchParams(params).toString()
    return await api('/api/attempts' + (qs ? '?' + qs : ''))
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
