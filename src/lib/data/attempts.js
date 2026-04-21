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
//
// scorePolicy (한글 라벨) 적용:
//   '최고 점수 유지' → 제출된 attempt 중 totalScore 최댓값
//   '최신 점수 유지' → 제출된 attempt 중 attemptNumber 최댓값의 totalScore
//   '평균 점수'        → 제출된 모든 attempt totalScore 평균 (null 제외)
//
// 표시용 attempt(selections / autoScores / manualScores / 제출일시)는 Canvas 관행대로 "최신 제출" 기준.
// 점수만 정책 따라 달라짐.
function mapAttemptsToStudents(attempts, scorePolicy) {
  // userId 별 그룹핑
  const byUser = new Map()
  for (const att of attempts) {
    const uid = att.userId
    if (!byUser.has(uid)) byUser.set(uid, [])
    byUser.get(uid).push(att)
  }

  return Array.from(byUser.values()).map(arr => {
    // 표시용 기준 — 제출된 것 우선, 그 중 attemptNumber 최대
    let display = arr[0]
    for (const a of arr) {
      const preferCurrent =
        (a.submitted && !display.submitted) ||
        (a.submitted === display.submitted && (a.attemptNumber ?? 0) > (display.attemptNumber ?? 0))
      if (preferCurrent) display = a
    }

    // 정책 기반 최종 점수 — 제출된 attempt 만 집계
    const submittedArr = arr.filter(a => a.submitted && a.totalScore !== null && a.totalScore !== undefined)
    let score = null
    if (submittedArr.length > 0) {
      if (scorePolicy === '평균 점수') {
        const sum = submittedArr.reduce((s, a) => s + a.totalScore, 0)
        score = Math.round((sum / submittedArr.length) * 10) / 10
      } else if (scorePolicy === '최신 점수 유지') {
        const latest = submittedArr.reduce(
          (best, a) => ((a.attemptNumber ?? 0) > (best.attemptNumber ?? 0) ? a : best),
          submittedArr[0],
        )
        score = latest.totalScore
      } else {
        // 기본값 '최고 점수 유지'
        score = Math.max(...submittedArr.map(a => a.totalScore))
      }
    }

    const selections = {}
    const autoScores = {}
    const manualScores = {}
    let hasManual = false
    for (const a of display.answers ?? []) {
      if (a.response !== undefined) selections[a.questionId] = a.response
      if (a.autoScore !== null && a.autoScore !== undefined) autoScores[a.questionId] = a.autoScore
      if (a.manualScore !== null && a.manualScore !== undefined) {
        manualScores[a.questionId] = a.manualScore
        hasManual = true
      }
    }
    return {
      id: display.userId,
      studentId: display.user?.studentId ?? '',
      name: display.user?.name ?? '',
      department: display.user?.department ?? '',
      score,
      submitted: !!display.submitted,
      submittedAt: fmtDate(display.submittedAt),
      startTime: fmtDate(display.startTime),
      endTime: fmtDate(display.submittedAt),
      response: null,
      selections,
      autoScores,
      manualScores: hasManual ? manualScores : null,
      attemptId: display.id,
      attemptNumber: display.attemptNumber,
    }
  })
}

export async function listAttempts(params = {}) {
  if (MODE === 'api') {
    const qs = new URLSearchParams(params).toString()
    if (params.quizId) {
      // 학생-중심 집계 — quiz.scorePolicy 함께 조회해 정책 반영
      const [rows, quiz] = await Promise.all([
        api('/api/attempts' + (qs ? '?' + qs : '')),
        api(`/api/quizzes/${params.quizId}`),
      ])
      return mapAttemptsToStudents(rows, quiz?.scorePolicy)
    }
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
