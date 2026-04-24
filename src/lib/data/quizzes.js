/**
 * Quizzes 데이터 레이어
 *
 * VITE_DATA_SOURCE=mock  → mockData.js 함수 호출 (동기를 Promise 로 감쌈)
 * VITE_DATA_SOURCE=api   → fetch('/api/quizzes/...')
 */
import { api } from '@/lib/api'
import { MODE, normalizeDate, currentLtiCourseCode } from './_common'
import {
  mockQuizzes,
  addQuiz as mockAdd,
  updateQuiz as mockUpdate,
  removeQuiz as mockRemove,
  getQuizQuestions as mockGetQuestions,
  setQuizQuestions as mockSetQuestions,
  recalculateScorePolicy as mockRecalcPolicy,
  regradeQuestionWithOption as mockRegradeQuestion,
} from '@/data/mockData'

// api 응답 Quiz → mockData 포맷 호환으로 정규화 (날짜 · 평균점수 반올림)
function normalizeQuiz(q) {
  if (!q) return q
  return {
    ...q,
    startDate: normalizeDate(q.startDate),
    dueDate: normalizeDate(q.dueDate),
    lockDate: normalizeDate(q.lockDate),
    lateSubmitDeadline: normalizeDate(q.lateSubmitDeadline),
    scoreRevealStart: normalizeDate(q.scoreRevealStart),
    scoreRevealEnd: normalizeDate(q.scoreRevealEnd),
    avgScore: typeof q.avgScore === 'number' ? Math.round(q.avgScore * 10) / 10 : q.avgScore,
  }
}

// "CS301 데이터베이스" 같은 라벨에서 코드만 추출 ("CS301")
function extractCourseCode(raw) {
  if (!raw) return ''
  const s = String(raw).trim()
  const first = s.split(/\s+/)[0]
  return first.toUpperCase()
}

// mock-shape quiz body → api createQuiz body 로 변환
function toApiQuizBody(body) {
  // LTI 모드: Canvas 과목으로 자동 격리. 기존 body.courseCode 는 덮어씀
  const ltiCode = currentLtiCourseCode()
  const effectiveCode = ltiCode || body.courseCode || extractCourseCode(body.course)
  return {
    title: body.title,
    courseCode: effectiveCode,
    description: body.description ?? undefined,
    status: body.status ?? 'draft',
    visible: body.visible ?? true,
    hasFileUpload: body.hasFileUpload ?? false,
    startDate: body.startDate || null,
    dueDate: body.dueDate || null,
    lockDate: body.lockDate || null,
    week: body.week ?? null,
    session: body.session ?? null,
    timeLimit: typeof body.timeLimit === 'number' ? body.timeLimit : null,
    allowAttempts: typeof body.allowAttempts === 'number' ? body.allowAttempts : 1,
    scorePolicy: body.scorePolicy ?? null,
    scoreRevealEnabled: !!body.scoreRevealEnabled,
    scoreRevealScope: body.scoreRevealScope ?? null,
    scoreRevealTiming: body.scoreRevealTiming ?? null,
    scoreRevealStart: body.scoreRevealStart || null,
    scoreRevealEnd: body.scoreRevealEnd || null,
    allowLateSubmit: !!body.allowLateSubmit,
    lateSubmitDeadline: body.lateSubmitDeadline || null,
  }
}

// 문항 body 에서 api 전송 전 정리 (mock 에만 있는 집계 필드 제거)
function toApiQuestionBody(q) {
  const { id: _id, gradedCount: _g, totalCount: _t, avgScore: _a, bankId: _b, ...rest } = q   
  return rest
}

export async function listQuizzes(params = {}) {
  // bypassLtiCourseFilter: 타 과목 퀴즈 가져오기 등 LTI 현재 과목 override 를
  // 건너뛰고 params.courseCode 를 그대로 사용해야 하는 경우 true 로 지정
  const { bypassLtiCourseFilter, ...query } = params
  // LTI 활성 상태에서는 서버 DB 에만 데이터가 존재 (mockQuizzes 는 CS301 등 비 LTI 전용).
  // MODE 가 mock 으로 배포된 경우에도 LTI 런칭 시 api 를 강제로 호출.
  const ltiActive = !!currentLtiCourseCode()
  if (MODE === 'api' || ltiActive) {
    const ltiCode = bypassLtiCourseFilter ? null : currentLtiCourseCode()
    const effectiveParams = ltiCode ? { ...query, courseCode: ltiCode } : query
    const qs = new URLSearchParams(effectiveParams).toString()
    const rows = await api('/api/quizzes' + (qs ? '?' + qs : ''))
    return rows.map(normalizeQuiz)
  }
  if (query.courseCode) {
    const code = String(query.courseCode).toUpperCase()
    return mockQuizzes.filter(q => (q.courseCode ?? q.course?.split(' ')[0] ?? '').toUpperCase() === code)
  }
  return [...mockQuizzes]
}

export async function getQuiz(id) {
  if (MODE === 'api') return normalizeQuiz(await api(`/api/quizzes/${id}`))
  return mockQuizzes.find(q => q.id === id) ?? null
}

export async function getQuizQuestions(id) {
  if (MODE === 'api') return await api(`/api/quizzes/${id}/questions`)
  return mockGetQuestions(id)
}

export async function createQuiz(body) {
  if (MODE === 'api') {
    return normalizeQuiz(await api('/api/quizzes', {
      method: 'POST', body: JSON.stringify(toApiQuizBody(body)),
    }))
  }
  const newQuiz = { id: body.id ?? 'new_' + Date.now(), ...body }
  mockAdd(newQuiz)
  return newQuiz
}

export async function updateQuiz(id, body) {
  if (MODE === 'api') {
    return normalizeQuiz(await api(`/api/quizzes/${id}`, {
      method: 'PATCH', body: JSON.stringify(toApiQuizBody(body)),
    }))
  }
  return mockUpdate(id, body)
}

export async function deleteQuiz(id) {
  if (MODE === 'api') {
    await api(`/api/quizzes/${id}`, { method: 'DELETE' })
    return true
  }
  return mockRemove(id)
}

// 개별 문항 CRUD (api 모드 전용 — mock 은 setQuizQuestions 로 일괄 처리)
export async function createQuizQuestion(quizId, body) {
  if (MODE === 'api') {
    return await api(`/api/quizzes/${quizId}/questions`, {
      method: 'POST', body: JSON.stringify(toApiQuestionBody(body)),
    })
  }
  throw new Error('createQuizQuestion: mock 모드에서는 setQuizQuestions 를 사용하세요')
}

export async function updateQuestion(id, body) {
  if (MODE === 'api') {
    return await api(`/api/questions/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  }
  throw new Error('updateQuestion: mock 모드에서는 setQuizQuestions 를 사용하세요')
}

export async function deleteQuestion(id) {
  if (MODE === 'api') {
    await api(`/api/questions/${id}`, { method: 'DELETE' })
    return true
  }
  throw new Error('deleteQuestion: mock 모드에서는 setQuizQuestions 를 사용하세요')
}

/**
 * 문항 재채점 — option 별 자동채점 재계산
 * @param {string} quizId        api 모드에서는 미사용 (mock 호환용)
 * @param {object} question      재채점 기준 문항 (id 필수)
 * @param {'full_points'|'new_answer_only'|'award_both'|'no_regrade'} option
 * @param {object} [oldQuestion] award_both 일 때 이전 정답 비교용
 * @returns {Promise<{ changedAnswers: number, changedAttempts: number, regradedStudents: number }>}
 */
export async function regradeQuestion(quizId, question, option, oldQuestion) {
  if (option === 'no_regrade') {
    return { changedAnswers: 0, changedAttempts: 0, regradedStudents: 0 }
  }
  if (MODE === 'api') {
    return await api(`/api/questions/${question.id}/regrade`, {
      method: 'POST',
      body: JSON.stringify({
        option,
        oldCorrectAnswer: oldQuestion?.correctAnswer,
      }),
    })
  }
  const count = mockRegradeQuestion(quizId, question, option, oldQuestion)
  return { changedAnswers: count, changedAttempts: count, regradedStudents: count }
}

/**
 * scorePolicy 변경 시 기존 응시 점수 소급 재계산
 * - api 모드: Quiz.scorePolicy 자체는 updateQuiz 가 PATCH 로 갱신.
 *   응시 점수는 조회 시 정책 기반으로 계산되므로 별도 작업 불필요 → no-op
 * - mock 모드: 각 attempt 의 scorePolicy 필드를 갱신해 getStudentAttempts 가 새 정책 반영
 * @param {string} quizId
 * @param {string} newPolicy
 * @returns {Promise<number>} 영향 받은 응시 건수 (api 는 항상 0)
 */
export async function recalculateScorePolicy(quizId, newPolicy) {
  if (MODE === 'api') return 0
  return mockRecalcPolicy(quizId, newPolicy)
}

export async function setQuizQuestions(id, questions) {
  if (MODE === 'api') {
    // api 모드: PUT 으로 배치 UPSERT — 기존 문항은 UPDATE (Answer FK 보존),
    // 입력에 없는 기존 문항만 DELETE. 새 문항은 CREATE 후 새 cuid 부여.
    const body = questions.map(toApiQuestionBodyKeepId)
    return await api(`/api/quizzes/${id}/questions`, {
      method: 'PUT', body: JSON.stringify(body),
    })
  }
  return mockSetQuestions(id, questions)
}

// 기존 toApiQuestionBody 는 id 를 떼는데, UPSERT 는 id 가 있어야 매칭 가능
function toApiQuestionBodyKeepId(q) {
  const { gradedCount: _g, totalCount: _t, avgScore: _a, bankId: _b, ...rest } = q   
  return rest
}
